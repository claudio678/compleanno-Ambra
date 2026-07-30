import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const KEY = 'ambra-regali-lista-v1';

const defaultItems = [
  { id: 'g1', name: 'Set costruzioni (120 pz, base-cestina)', icon: '🧱', link: 'https://amzn.eu/d/03sGrBSV', reservedBy: null },
  { id: 'g2', name: 'Xilofono / Metallofono per bimbi', icon: '🎵', link: 'https://www.amazon.it/Strumenti-Metallofono-Glockenspiel-Professionale-Giocattoli/dp/B09QCG8LNL', reservedBy: null },
  { id: 'g3', name: 'Set gioco pulizia (aspirapolvere giocattolo)', icon: '🧹', link: 'https://www.amazon.it/Dreamon-Aspirapolvere-aspirazione-funzione-giocattolo/dp/B0F17K1YGJ', reservedBy: null },
  { id: 'g4', name: 'Bicicletta prima infanzia senza pedali', icon: '🚲', link: 'https://www.amazon.it/MHCYLION-Bicicletta-Regolabili-Bloccasterzo-Giocattoli/dp/B0BWHSZV5N', reservedBy: null },
  { id: 'g5', name: 'Caschetto ABUS Smiley 3.0', icon: '⛑️', link: 'https://www.amazon.it/ABUS-Casco-bambini-Smiley-3-0/dp/B09B2XL8XB', reservedBy: null },
  { id: 'g6', name: 'FABA Raccontastorie interattivo', icon: '🦊', link: 'https://www.amazon.it/FABA-Raccontastorie-interattivo-contenuti-Personaggio/dp/B0DCKF4BFW', reservedBy: null },
  { id: 'g7', name: 'Personaggio FABA — Musica Maestro', icon: '🎶', link: 'https://www.amazon.it/FABA-Personaggio-Sonoro-Musica-Maestro/dp/B092VMXB7G', reservedBy: null },
  { id: 'g8', name: "Personaggio FABA — l'Elefante Ascoltabile", icon: '🐘', link: 'https://www.amazon.it/FABA-Personaggio-lElefante-Ascoltabile-Raccontastorie/dp/B0FH28X17H', reservedBy: null }
];

// Correzioni forzate: se un link cambia in futuro, aggiornarlo qui.
// Questo garantisce che i dati già salvati su Redis vengano corretti
// automaticamente, senza dover cancellare manualmente la chiave.
const linkCorrections = {
  g1: 'https://amzn.eu/d/03sGrBSV'
};

function applyCorrections(items) {
  let changed = false;
  const fixed = items.map((item) => {
    const correctLink = linkCorrections[item.id];
    if (correctLink && item.link !== correctLink) {
      changed = true;
      return { ...item, link: correctLink };
    }
    return item;
  });
  return { items: fixed, changed };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      let items = await redis.get(KEY);
      if (!items) {
        items = defaultItems;
        await redis.set(KEY, items);
      }
      const { items: fixedItems, changed } = applyCorrections(items);
      if (changed) await redis.set(KEY, fixedItems);
      return res.status(200).json({ items: fixedItems });
    }

    if (req.method === 'POST') {
      const { id, reservedBy } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'id mancante' });
      }

      let items = await redis.get(KEY);
      if (!items) items = defaultItems;
      ({ items } = applyCorrections(items));

      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'regalo non trovato' });
      }

      items[idx] = { ...items[idx], reservedBy: reservedBy || null };
      await redis.set(KEY, items);

      return res.status(200).json({ items });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method Not Allowed');
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Errore del server' });
  }
}
