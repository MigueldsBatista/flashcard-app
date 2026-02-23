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
    // Use SECURITY DEFINER RPC — bypasses RLS, validates token server-side
    const { data, error } = await supabase.rpc('get_shared_deck_by_token', {
      p_token: token
    });

    if (error) throw new Error(`Erro ao buscar baralho compartilhado: ${error.message}`);
    if (!data || data.error) throw new Error(data?.error ?? 'SHARE_NOT_FOUND');

    const deckData = data.deck;
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

    const cards: Card[] = (data.cards ?? []).map((c: Record<string, unknown>) => ({
      id: c.id,
      deckId: c.deck_id,
      content: c.content,
      status: c.status,
      interval: c.interval,
      easeFactor: c.ease_factor,
      repetitions: c.repetitions,
      lapses: c.lapses,
      lastReviewed: c.last_reviewed ? new Date(c.last_reviewed as string) : undefined,
      nextReview: new Date(c.next_review as string),
      created: new Date(c.created_at as string)
    }));

    const shareData = data.share;
    const share: DeckShare = {
      id: shareData.id,
      deckId: shareData.deck_id,
      ownerId: shareData.owner_id,
      shareToken: shareData.share_token,
      permission: shareData.permission as SharePermission,
      isActive: shareData.is_active,
      createdAt: new Date(shareData.created_at),
      accessCount: shareData.access_count
    };

    const ownerUsername = data.owner_username ?? null;

    return { deck, cards, share, ownerUsername };
  }

  async cloneDeck(_deckId: string, deckName: string, shareToken?: string): Promise<Deck> {
    if (!shareToken) {
      throw new Error('Token de compartilhamento necessário para clonar');
    }

    // Use SECURITY DEFINER RPC — bypasses RLS to read source cards
    const { data, error } = await supabase.rpc('clone_shared_deck', {
      p_token: shareToken,
      p_new_name: `${deckName} (cópia)`
    });

    if (error) throw new Error(`Erro ao clonar baralho: ${error.message}`);
    if (!data || data.error) throw new Error(data?.error ?? 'CLONE_FAILED');

    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      parentId: data.parent_id || undefined,
      color: data.color || undefined,
      icon: data.icon || undefined,
      created: new Date(data.created_at),
      updated: new Date(data.updated_at)
    };
  }
}
