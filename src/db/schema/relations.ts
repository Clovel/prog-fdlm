/* Module imports -------------------------------------- */
import { relations } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { editions } from './editions';
import { events } from './events';
import { eventLinks } from './eventLinks';
import { eventEmbedLinks } from './eventEmbedLinks';
import { eventAlerts } from './eventAlerts';
import { generalAlerts } from './generalAlerts';

/* Relations ------------------------------------------- */
export const editionsRelations = relations(editions, ({ many }) => ({
  events: many(events),
  generalAlerts: many(generalAlerts),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  edition: one(editions, {
    fields: [events.editionId],
    references: [editions.id],
  }),
  links: many(eventLinks),
  embedLinks: many(eventEmbedLinks),
  alerts: many(eventAlerts),
}));

export const eventLinksRelations = relations(eventLinks, ({ one }) => ({
  event: one(events, {
    fields: [eventLinks.eventId],
    references: [events.id],
  }),
}));

export const eventEmbedLinksRelations = relations(eventEmbedLinks, ({ one }) => ({
  event: one(events, {
    fields: [eventEmbedLinks.eventId],
    references: [events.id],
  }),
}));

export const eventAlertsRelations = relations(eventAlerts, ({ one }) => ({
  event: one(events, {
    fields: [eventAlerts.eventId],
    references: [events.id],
  }),
}));

export const generalAlertsRelations = relations(generalAlerts, ({ one }) => ({
  edition: one(editions, {
    fields: [generalAlerts.editionId],
    references: [editions.id],
  }),
}));
