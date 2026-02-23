import { supabase } from '@/lib/supabase';
import type { IShareService, SharedDeckData } from '@/services/types';
import { useAuthStore } from '@/stores/auth';
import type { Card, Deck, DeckShare, SharePermission } from '@/types/flashcard';

export class SupabaseShareService implements IShareService {
  private getUserId(): string {
    const authStore = useAuthStore();
    const user = authStore.user;
    if (!user) throw new Error('Usuário não autenticado');
    return user.id;
  }

  private mapRow(row: Record<string, unknown>): DeckShare {
    return {
      id: row.id as string,
      deckId: row.deck_id as string,
      ownerId: row.owner_id as string,
      shareToken: row.share_token as string,
      permission: row.permission as SharePermission,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      accessCount: row.access_count as number
    };
  }

  async getShareByDeckId(deckId: string): Promise<DeckShare | null> {
    const { data, error } = await supabase
      .from('deck_shares')
      .select('*')
      .eq('deck_id', deckId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar compartilhamento: ${error.message}`);
    return data ? this.mapRow(data) : null;
  }

  async getShareByToken(token: string): Promise<DeckShare | null> {
    const { data, error } = await supabase
      .from('deck_shares')
      .select('*')
      .eq('share_token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar compartilhamento: ${error.message}`);
    return data ? this.mapRow(data) : null;
  }

  async createShare(deckId: string): Promise<DeckShare> {
    const userId = this.getUserId();

    const { data, error } = await supabase
      .from('deck_shares')
      .insert({
        deck_id: deckId,
        owner_id: userId,
        permission: 'read'
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar compartilhamento: ${error.message}`);
    return this.mapRow(data);
  }

  async updatePermission(shareId: string, permission: SharePermission): Promise<void> {
    const { error } = await supabase
      .from('deck_shares')
      .update({ permission })
      .eq('id', shareId);

    if (error) throw new Error(`Erro ao atualizar permissão: ${error.message}`);
  }

  async deactivateShare(shareId: string): Promise<void> {
    const { error } = await supabase
      .from('deck_shares')
      .update({ is_active: false })
      .eq('id', shareId);

    if (error) throw new Error(`Erro ao desativar compartilhamento: ${error.message}`);
  }

  async getMyShares(): Promise<DeckShare[]> {
    const userId = this.getUserId();

    const { data, error } = await supabase
      .from('deck_shares')
      .select('*')
      .eq('owner_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao buscar compartilhamentos: ${error.message}`);
    return (data ?? []).map(row => this.mapRow(row));
  }

  async incrementAccessCount(shareId: string): Promise<void> {
    // Use raw SQL via RPC to atomically increment
    const { data, error: fetchError } = await supabase
      .from('deck_shares')
      .select('access_count')
      .eq('id', shareId)
      .single();

    if (fetchError || !data) return;

    await supabase
      .from('deck_shares')
      .update({ access_count: (data.access_count ?? 0) + 1 })
      .eq('id', shareId);
  }

  async getSharedDeckWithCards(token: string): Promise<SharedDeckData> {
    // 1. Fetch the share
    const share = await this.getShareByToken(token);
    if (!share) throw new Error('SHARE_NOT_FOUND');

    // 2. Fetch the deck
    const { data: deckData, error: deckError } = await supabase
      .from('decks')
      .select('*')
      .eq('id', share.deckId)
      .single();

    if (deckError) throw new Error(`Erro ao buscar baralho: ${deckError.message}`);

    const deck: Deck = {
      id: deckData.id,
      name: deckData.name,
      description: deckData.description,
      parentId: deckData.parent_id,
      color: deckData.color,
      icon: deckData.icon,
      created: new Date(deckData.created_at),
      updated: new Date(deckData.updated_at)
    };

    // 3. Fetch cards of the deck
    const { data: cardsData, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', share.deckId);

    if (cardsError) throw new Error(`Erro ao buscar cartões: ${cardsError.message}`);

    const cards: Card[] = (cardsData ?? []).map(c => ({
      id: c.id,
      deckId: c.deck_id,
      content: c.content,
      status: c.status,
      interval: c.interval,
      easeFactor: c.ease_factor,
      repetitions: c.repetitions,
      lapses: c.lapses,
      lastReviewed: c.last_reviewed ? new Date(c.last_reviewed) : undefined,
      nextReview: new Date(c.next_review),
      created: new Date(c.created_at)
    }));

    // 4. Fetch owner username
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', share.ownerId)
      .maybeSingle();

    const ownerUsername = profileData?.username ?? null;

    // 5. Increment access count (fire-and-forget)
    this.incrementAccessCount(share.id).catch(() => { });

    return { deck, cards, share, ownerUsername };
  }

  async cloneDeck(deckId: string, deckName: string): Promise<Deck> {
    const userId = this.getUserId();

    // 1. Create the new deck
    const { data: newDeckData, error: deckError } = await supabase
      .from('decks')
      .insert({
        user_id: userId,
        name: `${deckName} (cópia)`
      })
      .select()
      .single();

    if (deckError) throw new Error(`Erro ao clonar baralho: ${deckError.message}`);

    // 2. Fetch original cards
    const { data: originalCards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId);

    if (cardsError) throw new Error(`Erro ao buscar cartões originais: ${cardsError.message}`);

    // 3. Clone cards with reset SRS values
    if (originalCards && originalCards.length > 0) {
      const clonedCards = originalCards.map(c => ({
        user_id: userId,
        deck_id: newDeckData.id,
        content: c.content,
        status: 'new',
        interval: 0,
        ease_factor: 2.5,
        repetitions: 0,
        lapses: 0,
        next_review: new Date().toISOString()
      }));

      const { error: insertError } = await supabase.from('cards').insert(clonedCards);
      if (insertError) throw new Error(`Erro ao clonar cartões: ${insertError.message}`);
    }

    return {
      id: newDeckData.id,
      name: newDeckData.name,
      description: newDeckData.description || undefined,
      parentId: newDeckData.parent_id || undefined,
      color: newDeckData.color || undefined,
      icon: newDeckData.icon || undefined,
      created: new Date(newDeckData.created_at),
      updated: new Date(newDeckData.updated_at)
    };
  }
}
