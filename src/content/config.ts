import { z, defineCollection } from "astro:content";

const cardsCollection = defineCollection({
  type: "data",
  schema: z.object({
    id: z.number(),
    displayName: z.string(),
    username: z.string(),
    isBlueVerified: z.boolean(),
    followers: z.number(),
    following: z.number(),
    hitPoints: z.number(),
    profilePicUrl: z.string(),
    bannerPicUrl: z.string(),
    fullArtUrl: z.string().nullable(),
    cardType: z.enum(["normal", "fullArt"]),
    tier: z.string(),
    abilityName: z.string(),
    abilityDescription: z.string(),
    attackName: z.string(),
    attackDescription: z.string(),
    attackType: z.string(),
    attackDamage: z.number(),
    weaknessType: z.string(),
    weaknessAmount: z.number(),
    resistType: z.string(),
    resistAmount: z.number(),
    description: z.string(),
    rarity: z.string(),
    holo: z.boolean(),
    xId: z.string(),
    disabled: z.boolean().optional(),
  }),
});

const actionCardsCollection = defineCollection({
  type: "data",
  schema: z.object({
    id: z.number(),
    title: z.string(),
    type: z.string(),
    effect: z.string(),
    flavor: z.string(),
    imageUrl: z.string(),
    rarity: z.string(),
    inspiredBy: z.string().url().optional(),
  }),
});

export const collections = {
  cards: cardsCollection,
  "action-cards": actionCardsCollection,
};