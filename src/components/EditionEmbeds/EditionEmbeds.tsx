'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { InstagramEmbed, FacebookEmbed } from 'components/embeds';

/* Type imports ---------------------------------------- */
import type { EmbedLinkView } from 'app/(public)/[year]/types';

/* EditionEmbeds component prop types ------------------ */
interface EditionEmbedsProps {
  embeds: EmbedLinkView[];
}

/* EditionEmbeds component ----------------------------- */
const EditionEmbeds: React.FC<EditionEmbedsProps> = ({ embeds }) => {
  if(embeds.length === 0) {
    return null;
  }
  return (
    <section className="w-full max-w-5xl px-4 lg:py-8 mx-auto lg:px-0">
      <h4 className="text-2xl font-semibold tracking-tight pb-4">
        Sur les réseaux
      </h4>
      <div className="flex flex-col items-center gap-6">
        {
          embeds.map((embed) => (
            embed.platform === 'facebook'
              ? <FacebookEmbed key={embed.id} url={embed.url} />
              : <InstagramEmbed key={embed.id} url={embed.url} />
          ))
        }
      </div>
    </section>
  );
};

/* Export EditionEmbeds component ---------------------- */
export default EditionEmbeds;
