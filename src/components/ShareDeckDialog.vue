<script setup lang="ts">
import Button from '@/components/ui/Button.vue';
import Dialog from '@/components/ui/Dialog.vue';
import Select from '@/components/ui/Select.vue';
import { useNotifications } from '@/composables/useNotifications';
import { shareService } from '@/services/provider';
import type { Deck, DeckShare, SharePermission } from '@/types/flashcard';
import { ClipboardCopy, Link2, Loader2, ShieldAlert } from 'lucide-vue-next';
import { ref, watch } from 'vue';

const props = defineProps<{
  deck: Deck | null;
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const { success, error: showError } = useNotifications();

const loading = ref(false);
const share = ref<DeckShare | null>(null);
const showDeactivateConfirm = ref(false);

const permissionOptions = [
  { value: 'read', label: 'Somente Leitura' },
  { value: 'write', label: 'Pode Editar' },
  { value: 'admin', label: 'Pode Editar e Adicionar' }
];

const currentPermission = ref('read');

watch(() => props.open, async (isOpen) => {
  if (isOpen && props.deck) {
    loading.value = true;
    try {
      const existing = await shareService.getShareByDeckId(props.deck.id);
      share.value = existing;
      if (existing) {
        currentPermission.value = existing.permission;
      }
    } catch {
      showError('Erro ao carregar compartilhamento');
    } finally {
      loading.value = false;
    }
  } else {
    share.value = null;
    showDeactivateConfirm.value = false;
  }
});

function getShareUrl(): string {
  if (!share.value) return '';
  return `${window.location.origin}/shared/${share.value.shareToken}`;
}

async function handleGenerateLink() {
  if (!props.deck) return;
  loading.value = true;
  try {
    const newShare = await shareService.createShare(props.deck.id);
    share.value = newShare;
    currentPermission.value = newShare.permission;
    success('Link de compartilhamento criado!');
  } catch {
    showError('Erro ao gerar link');
  } finally {
    loading.value = false;
  }
}

async function handleCopyLink() {
  try {
    await navigator.clipboard.writeText(getShareUrl());
    success('Link copiado para a área de transferência!');
  } catch {
    showError('Erro ao copiar link');
  }
}

async function handlePermissionChange(value: string) {
  if (!share.value) return;
  const permission = value as SharePermission;
  try {
    await shareService.updatePermission(share.value.id, permission);
    share.value = { ...share.value, permission };
    currentPermission.value = permission;
    success('Permissão atualizada!');
  } catch {
    showError('Erro ao atualizar permissão');
  }
}

async function handleDeactivate() {
  if (!share.value) return;
  loading.value = true;
  try {
    await shareService.deactivateShare(share.value.id);
    share.value = null;
    showDeactivateConfirm.value = false;
    success('Link desativado com sucesso');
  } catch {
    showError('Erro ao desativar link');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #default="{ close }">
      <div class="space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Link2 class="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-foreground">
              Compartilhar Baralho
            </h2>
            <p class="text-sm text-muted-foreground">
              {{ deck?.name }}
            </p>
          </div>
        </div>

        <!-- Loading -->
        <div
          v-if="loading"
          class="flex items-center justify-center py-8"
        >
          <Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
        </div>

        <!-- No share yet -->
        <template v-else-if="!share">
          <p class="text-sm text-muted-foreground">
            Gere um link público para que outras pessoas possam acessar este baralho.
          </p>
          <Button
            class="w-full"
            @click="handleGenerateLink"
          >
            <Link2 class="w-4 h-4 mr-2" />
            Gerar Link
          </Button>
        </template>

        <!-- Share exists -->
        <template v-else>
          <!-- Link display + copy -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-muted-foreground">
              Link de compartilhamento
            </label>
            <div class="flex items-center gap-2">
              <input
                :value="getShareUrl()"
                readonly
                class="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground truncate"
              >
              <Button
                variant="outline"
                size="sm"
                class="shrink-0"
                @click="handleCopyLink"
              >
                <ClipboardCopy class="w-4 h-4" />
              </Button>
            </div>
          </div>

          <!-- Permission selector -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-muted-foreground">
              Permissão
            </label>
            <Select
              :model-value="currentPermission"
              :options="permissionOptions"
              @update:model-value="handlePermissionChange"
            />
          </div>

          <!-- Deactivate -->
          <div class="pt-2 border-t border-border">
            <template v-if="!showDeactivateConfirm">
              <button
                class="text-sm text-destructive hover:underline"
                @click="showDeactivateConfirm = true"
              >
                <ShieldAlert class="w-4 h-4 inline mr-1" />
                Desativar Link
              </button>
            </template>
            <template v-else>
              <div class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-3">
                <p class="text-sm text-destructive font-medium">
                  Tem certeza? Todas as pessoas com este link perderão o acesso imediatamente.
                </p>
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="showDeactivateConfirm = false"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    class="bg-destructive hover:bg-destructive/90 text-white"
                    @click="handleDeactivate"
                  >
                    Sim, desativar
                  </Button>
                </div>
              </div>
            </template>
          </div>
        </template>

        <!-- Close button -->
        <div class="flex justify-end pt-2">
          <Button
            variant="outline"
            @click="close()"
          >
            Fechar
          </Button>
        </div>
      </div>
    </template>
  </Dialog>
</template>
