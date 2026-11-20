/// <reference types="astro/client" />

declare global {
  namespace App {
    interface Locals {
      /** Authenticated user, populated by middleware for on-demand pages. */
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

export {};
