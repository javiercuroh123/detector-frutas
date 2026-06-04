import { Injectable, signal, computed } from '@angular/core';
import * as tf from '@tensorflow/tfjs';

export type FruitClass = 'maduro' | 'verde' | 'podrido';

export interface PredictionResult {
  probs: number[];   // siempre [maduro, verde, podrido]
  winClass: FruitClass;
  confidence: number;
  isLowConfidence: boolean;
  inferenceMs: number;
}

export interface HistoryEntry {
  fruit: string;
  cls: FruitClass;
  confidence: number;
  time: string;
}

@Injectable({ providedIn: 'root' })
export class ModelService {
  // Orden real del modelo entrenado (según metadata.json)
  private readonly CLASS_ORDER: FruitClass[] = ['maduro', 'podrido', 'verde'];

  private tfModel: tf.LayersModel | tf.GraphModel | null = null;

  readonly modelLoaded  = signal(false);
  readonly modelLoading = signal(true);
  readonly modelError   = signal<string>('');
  readonly isAnalyzing  = signal(false);
  readonly lastResult   = signal<PredictionResult | null>(null);
  readonly selectedFruit = signal<string>('plátano');

  private readonly _stats = signal({ maduro: 0, verde: 0, podrido: 0 });
  readonly stats = this._stats.asReadonly();
  readonly history = signal<HistoryEntry[]>([]);

  readonly totalAnalyzed = computed(() => {
    const s = this._stats();
    return s.maduro + s.verde + s.podrido;
  });

  constructor() {
    this.loadModel();
  }

  // ── Carga el modelo TF.js desde assets ─────────────────────────────────────
  private async loadModel(): Promise<void> {
    try {
      const check = await fetch('assets/model/model.json');
      if (!check.ok) throw new Error(`HTTP ${check.status} al obtener model.json`);

      // Detectar el formato leyendo el model.json
      const json = await check.json();
      const format: string = json.format ?? 'layers-model';
      console.log('Formato del modelo:', format);

      if (format === 'graph-model') {
        // Generado con tfjs_graph_model (SavedModel → converter)
        this.tfModel = await tf.loadGraphModel('assets/model/model.json');
      } else {
        // Generado con save_keras_model (layers-model)
        this.tfModel = await tf.loadLayersModel('assets/model/model.json');
      }

      // Calentar con tensor vacío
      const dummy = tf.zeros([1, 224, 224, 3]);
      (this.tfModel as any).predict(dummy);
      dummy.dispose();

      this.modelLoaded.set(true);
      this.modelError.set('');
      console.log('✅ Modelo TF.js cargado —', format);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error('❌ Error al cargar el modelo TF.js:', e);
      this.modelError.set(msg);
      this.modelLoaded.set(false);
    } finally {
      this.modelLoading.set(false);
    }
  }

  // ── Inferencia real con la imagen/video de la cámara ───────────────────────
  async runInference(
    source: HTMLVideoElement | HTMLImageElement
  ): Promise<void> {
    if (this.isAnalyzing()) return;
    this.isAnalyzing.set(true);

    const t0 = performance.now();
    let rawProbs: number[];

    if (this.tfModel) {
      rawProbs = await this.realPredict(source);
    } else {
      // Fallback simulado si el modelo no cargó
      await new Promise<void>(res => setTimeout(res, 350 + Math.random() * 300));
      rawProbs = this.mockPredict('random');
    }

    this.processResult(rawProbs, Math.round(performance.now() - t0));
  }

  // ── Demo con escenario simulado (botones de prueba) ─────────────────────────
  async runDemo(scenario: FruitClass | 'low' | 'random'): Promise<void> {
    if (this.isAnalyzing()) return;
    this.isAnalyzing.set(true);

    const t0 = performance.now();
    await new Promise<void>(res => setTimeout(res, 280 + Math.random() * 420));
    const rawProbs = this.mockPredict(scenario);

    this.processResult(rawProbs, Math.round(performance.now() - t0));
  }

  resetStats(): void {
    this._stats.set({ maduro: 0, verde: 0, podrido: 0 });
    this.history.set([]);
    this.lastResult.set(null);
  }

  // ── Inferencia TF.js ────────────────────────────────────────────────────────
  private async realPredict(
    source: HTMLVideoElement | HTMLImageElement
  ): Promise<number[]> {
    const tensor = tf.tidy(() =>
      tf.browser
        .fromPixels(source)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(255)
        .expandDims(0)
    );

    const output = this.tfModel!.predict(tensor) as tf.Tensor;
    const data   = Array.from(await output.data());
    tf.dispose([tensor, output]);
    return data;
  }

  // ── Convierte probs crudas y guarda resultado ───────────────────────────────
  private processResult(rawProbs: number[], inferenceMs: number): void {
    const maxIdx   = rawProbs.indexOf(Math.max(...rawProbs));
    const winClass = this.CLASS_ORDER[maxIdx];
    const confidence    = rawProbs[maxIdx];
    const isLowConfidence = confidence < 0.6;

    // Normalizar al orden fijo [maduro, verde, podrido] para la UI
    const probs = [
      rawProbs[this.CLASS_ORDER.indexOf('maduro')],
      rawProbs[this.CLASS_ORDER.indexOf('verde')],
      rawProbs[this.CLASS_ORDER.indexOf('podrido')],
    ];

    this.lastResult.set({ probs, winClass, confidence, isLowConfidence, inferenceMs });
    this.isAnalyzing.set(false);

    if (!isLowConfidence) {
      const s = this._stats();
      this._stats.set({ ...s, [winClass]: s[winClass] + 1 });

      const now  = new Date();
      const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      this.history.set(
        [{ fruit: this.selectedFruit(), cls: winClass, confidence: Math.round(confidence * 100), time },
         ...this.history()].slice(0, 20)
      );
    }
  }

  // ── Simulación (demo y fallback) ────────────────────────────────────────────
  private mockPredict(scenario: string): number[] {
    let probs: number[];
    if (scenario === 'maduro') {
      const m = 0.72 + Math.random() * 0.25;
      const v = (1 - m) * Math.random() * 0.7;
      probs = [m, v, Math.max(0, 1 - m - v)];
    } else if (scenario === 'verde') {
      const v = 0.65 + Math.random() * 0.3;
      const m = (1 - v) * Math.random() * 0.6;
      probs = [m, v, Math.max(0, 1 - v - m)];
    } else if (scenario === 'podrido') {
      const p = 0.68 + Math.random() * 0.28;
      const m = (1 - p) * Math.random() * 0.5;
      probs = [Math.max(0, m), Math.max(0, 1 - p - m), p];
    } else if (scenario === 'low') {
      probs = [Math.random() * 0.45, Math.random() * 0.45, Math.random() * 0.45];
    } else {
      const picks: FruitClass[] = ['maduro', 'verde', 'podrido'];
      return this.mockPredict(picks[Math.floor(Math.random() * 3)]);
    }
    const sum = probs.reduce((a, b) => a + b, 0);
    return probs.map(p => Math.max(0, p) / sum);
  }
}
