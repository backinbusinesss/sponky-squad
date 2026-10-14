# Superbike GLB

Metti qui il modello premium della moto e chiamalo:

```text
public/models/superbike.glb
```

La hero lo carica automaticamente. Consigli tecnici per evitare lag:

- formato `.glb` unico, texture embedded o nella stessa cartella;
- massimo 80k-150k triangoli per web hero;
- texture 1K o 2K, preferibilmente WebP/KTX2;
- comprimi con Meshopt o Draco se possibile;
- origine vicino al centro della moto, asse Y verso l'alto;
- vista consigliata: tre quarti anteriore, carena sportiva/supersport.

Se il file non esiste, il sito usa un fallback leggero solo per non lasciare la hero vuota.
