import { Component, inject, computed } from '@angular/core';
import { ModelService } from '../../services/model';
import { PredictionService } from '../../services/prediction';

@Component({
  selector: 'app-result',
  imports: [],
  templateUrl: './result.html',
  styleUrl: './result.scss',
})
export class Result {
  private readonly modelSvc = inject(ModelService);
  private readonly predSvc = inject(PredictionService);

  readonly result = this.modelSvc.lastResult;
  readonly selectedFruit = this.modelSvc.selectedFruit;

  /* SVG gauge: r=52, cx=70, cy=70, circumference≈326.7, 270° arc≈245.1 */
  private readonly CIRC = 326.7;
  private readonly ARC  = 245.1;

  readonly displayClass = computed(() => {
    const r = this.result();
    if (!r) return 'idle';
    return r.isLowConfidence ? 'warn' : r.winClass;
  });

  readonly displayLabel = computed(() => {
    const r = this.result();
    if (!r) return 'ESPERANDO';
    return r.isLowConfidence ? 'INCIERTO' : this.predSvc.getInfo(r.winClass).label;
  });

  readonly displayIcon = computed(() => {
    const r = this.result();
    if (!r) return '❓';
    return r.isLowConfidence ? '⚠️' : this.predSvc.getInfo(r.winClass).icon;
  });

  readonly displaySub = computed(() => {
    const r = this.result();
    if (!r) return 'Apunta la cámara a una fruta';
    return r.isLowConfidence
      ? 'Confianza baja — mejora la iluminación'
      : this.selectedFruit().toUpperCase();
  });

  readonly confidencePct = computed(() => {
    const r = this.result();
    return r ? Math.round(r.confidence * 100) : 0;
  });

  readonly gaugeDash = computed(() => {
    const filled = (this.confidencePct() / 100) * this.ARC;
    return `${filled} ${this.CIRC - filled}`;
  });

  readonly gaugeColor = computed(() => {
    const r = this.result();
    if (!r || r.isLowConfidence) return '#fbbf24';
    const map: Record<string, string> = { maduro: '#4ade80', verde: '#fbbf24', podrido: '#f87171' };
    return map[r.winClass] ?? '#fbbf24';
  });

  readonly probMaduro  = computed(() => this.result() ? Math.round(this.result()!.probs[0] * 100) : 0);
  readonly probVerde   = computed(() => this.result() ? Math.round(this.result()!.probs[1] * 100) : 0);
  readonly probPodrido = computed(() => this.result() ? Math.round(this.result()!.probs[2] * 100) : 0);

  readonly recommendation = computed(() => {
    const r = this.result();
    if (!r) return null;
    if (r.isLowConfidence) {
      return {
        icon: '💡', cls: 'warn',
        title: 'Repetir captura',
        desc: 'La confianza es menor al 60 %. Mejore la iluminación y acerque la fruta al encuadre.',
      };
    }
    const info = this.predSvc.getInfo(r.winClass);
    return { icon: info.recIcon, cls: r.winClass, title: info.recTitle, desc: info.recDesc };
  });

  readonly inferenceTime = computed(() => {
    const r = this.result();
    return r ? `${r.inferenceMs} ms` : '—';
  });
}
