import { Component, inject } from '@angular/core';
import { Camera } from './components/camera/camera';
import { Result } from './components/result/result';
import { Stats } from './components/stats/stats';
import { ModelService } from './services/model';

@Component({
  selector: 'app-root',
  imports: [Camera, Result, Stats],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly modelSvc = inject(ModelService);
}
