import { Injectable } from '@angular/core';
import type { FruitClass } from './model';

export interface ClassInfo {
  label: string;
  icon: string;
  recIcon: string;
  recTitle: string;
  recDesc: string;
}

@Injectable({ providedIn: 'root' })
export class PredictionService {
  readonly classMap: Record<FruitClass, ClassInfo> = {
    maduro: {
      label: 'MADURO',
      icon: '✅',
      recIcon: '🛒',
      recTitle: 'Listo para la venta',
      recDesc: 'La fruta está en su punto óptimo. Puede comercializarse o consumirse de inmediato.',
    },
    verde: {
      label: 'VERDE',
      icon: '⏳',
      recIcon: '⏰',
      recTitle: 'Esperar maduración',
      recDesc: 'La fruta no ha alcanzado su punto óptimo. Se recomienda esperar 2–5 días.',
    },
    podrido: {
      label: 'PODRIDO',
      icon: '🚫',
      recIcon: '🗑️',
      recTitle: 'Descartar / No apto',
      recDesc: 'La fruta presenta deterioro avanzado. No es apta para la venta ni consumo.',
    },
  };

  readonly fruitEmojis: Record<string, Record<FruitClass, string>> = {
    'plátano':  { maduro: '🍌', verde: '🫛',  podrido: '🤢' },
    'mango':    { maduro: '🥭', verde: '🫒',  podrido: '🤢' },
    'fresa':    { maduro: '🍓', verde: '🌱',  podrido: '🤢' },
    'naranja':  { maduro: '🍊', verde: '🟢',  podrido: '🤢' },
    'manzana':  { maduro: '🍎', verde: '🍏',  podrido: '🤢' },
  };

  readonly chipEmojis: Record<string, string> = {
    'plátano': '🍌', 'mango': '🥭', 'fresa': '🍓', 'naranja': '🍊', 'manzana': '🍎',
  };

  readonly fruits = ['plátano', 'manzana', 'naranja'] as const;

  getInfo(cls: FruitClass): ClassInfo {
    return this.classMap[cls];
  }

  getEmoji(fruit: string, cls: FruitClass): string {
    return this.fruitEmojis[fruit]?.[cls] ?? '🍑';
  }

  getChipEmoji(fruit: string): string {
    return this.chipEmojis[fruit] ?? '🍑';
  }
}
