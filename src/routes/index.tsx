import { createFileRoute } from '@tanstack/react-router';
import { DungeonGame } from '@/components/DungeonGame';

export const Route = createFileRoute('/')({
  ssr: false,
  head: () => ({ meta: [
    { title: 'Guerreiro das Trevas — A Masmorra Esquecida' },
    { name: 'description', content: 'Explore um labirinto de pedra em primeira pessoa, enfrente goblins e encontre a única saída da masmorra.' },
    { property: 'og:title', content: 'Guerreiro das Trevas — A Masmorra Esquecida' },
    { property: 'og:description', content: 'Um labirinto pixelizado com tochas, guerreiros caídos e uma única porta de saída.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: DungeonGame,
});
