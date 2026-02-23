/* eslint-disable no-restricted-imports */
import { ApiAIGeneratorService } from './api/ai-generator.service';
import { SupabaseCardService, SupabaseDeckService, SupabaseSessionService, SupabaseShareService } from './supabase';
import type { IAIGeneratorService, ICardService, IDeckService, ISessionService, IShareService } from './types';

export const deckService: IDeckService = new SupabaseDeckService();
export const cardService: ICardService = new SupabaseCardService();
export const sessionService: ISessionService = new SupabaseSessionService();
export const aiGeneratorService: IAIGeneratorService = new ApiAIGeneratorService();
export const shareService: IShareService = new SupabaseShareService();
