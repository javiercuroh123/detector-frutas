import { Component, inject, computed } from '@angular/core';
import { ModelService } from '../../services/model';
import { PredictionService } from '../../services/prediction';
import type { FruitClass } from '../../services/model';

@Component({
  selector: 'app-stats',
  imports: [],
  templateUrl: './stats.html',
  styleUrl: './stats.scss',
})
export class Stats {
  private readonly modelSvc = inject(ModelService);
  private readonly predSvc = inject(PredictionService);

  readonly stats = this.modelSvc.stats;
  readonly total = this.modelSvc.totalAnalyzed;
  readonly history = this.modelSvc.history;

  readonly pctMaduro  = computed(() => this.pct(this.stats().maduro));
  readonly pctVerde   = computed(() => this.pct(this.stats().verde));
  readonly pctPodrido = computed(() => this.pct(this.stats().podrido));

  resetStats(): void {
    this.modelSvc.resetStats();
  }

  getEmoji(fruit: string, cls: FruitClass): string {
    return this.predSvc.getEmoji(fruit, cls);
  }

  clsLabel(cls: FruitClass): string {
    return { maduro: 'Maduro', verde: 'Verde', podrido: 'Podrido' }[cls];
  }

  private pct(n: number): number {
    const t = this.total();
    return t > 0 ? Math.round((n / t) * 100) : 0;
  }
}
