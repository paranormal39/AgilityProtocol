export interface PermissionDeck {
  id: string;
  name: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

export interface PermissionDeckCreateParams {
  name: string;
  permissions: string[];
}

export interface PermissionDeckState {
  decks: PermissionDeck[];
}
