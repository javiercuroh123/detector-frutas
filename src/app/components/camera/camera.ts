import { Component, signal, viewChild, ElementRef, inject, OnDestroy } from '@angular/core';
import { ModelService } from '../../services/model';
import { PredictionService } from '../../services/prediction';
import type { FruitClass } from '../../services/model';

@Component({
  selector: 'app-camera',
  imports: [],
  templateUrl: './camera.html',
  styleUrl: './camera.scss',
})
export class Camera implements OnDestroy {
  private readonly modelSvc = inject(ModelService);
  private readonly predSvc  = inject(PredictionService);

  readonly videoEl     = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  readonly previewImg  = viewChild<ElementRef<HTMLImageElement>>('previewImg');
  readonly fileInputEl = viewChild<ElementRef<HTMLInputElement>>('fileInputEl');

  readonly cameraActive = signal(false);
  readonly imageLoaded  = signal(false);
  readonly cameraError  = signal(false);
  readonly statusText   = signal('Sin cámara');

  readonly isAnalyzing  = this.modelSvc.isAnalyzing;
  readonly modelLoaded  = this.modelSvc.modelLoaded;
  readonly modelLoading = this.modelSvc.modelLoading;
  readonly selectedFruit = this.modelSvc.selectedFruit;
  readonly fruits = this.predSvc.fruits;

  private stream: MediaStream | null = null;

  get hasSource(): boolean {
    return this.cameraActive() || this.imageLoaded();
  }

  async startCamera(): Promise<void> {
    if (this.cameraActive()) return;
    this.cameraError.set(false);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      const video = this.videoEl()?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        this.cameraActive.set(true);
        this.imageLoaded.set(false);
        this.statusText.set('● En vivo');
      }
    } catch {
      this.cameraError.set(true);
      this.statusText.set('Permiso denegado');
    }
  }

  stopCamera(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    const video = this.videoEl()?.nativeElement;
    if (video) video.srcObject = null;
    this.cameraActive.set(false);
    this.imageLoaded.set(false);
    this.cameraError.set(false);
    this.statusText.set('Sin cámara');
  }

  // ── Inferencia real: pasa el elemento actual al modelo ─────────────────────
  analyze(): void {
    if (!this.hasSource || this.isAnalyzing()) return;

    const source = this.cameraActive()
      ? this.videoEl()?.nativeElement
      : this.previewImg()?.nativeElement;

    if (source) this.modelSvc.runInference(source);
  }

  // ── Demo: siempre simulado ─────────────────────────────────────────────────
  runDemo(scenario: FruitClass | 'low'): void {
    this.modelSvc.runDemo(scenario);
  }

  triggerUpload(): void {
    this.fileInputEl()?.nativeElement.click();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const img = this.previewImg()?.nativeElement;
      if (img) {
        img.onload = () => {
          // Analizar automáticamente cuando la imagen termina de cargar
          this.modelSvc.runInference(img);
        };
        img.src = ev.target?.result as string;
        this.stopCameraStream();
        this.imageLoaded.set(true);
        this.cameraActive.set(false);
        this.statusText.set('Imagen cargada');
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  selectFruit(fruit: string): void {
    this.modelSvc.selectedFruit.set(fruit);
  }

  getChipEmoji(fruit: string): string {
    return this.predSvc.getChipEmoji(fruit);
  }

  private stopCameraStream(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    const video = this.videoEl()?.nativeElement;
    if (video) video.srcObject = null;
  }

  ngOnDestroy(): void {
    this.stopCameraStream();
  }
}
