import { Component } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private service: TranslocoService) {}

  ngOnInit() {
    this.service.translate('32');
    this.service.translate('33.34.35');
    this.service.translate('general.a.b');
    this.service.translate('general_b.a');
    this.service.translate('36', {}, 'es');
    this.service.translate('37', {});
    this.service.translate('37333', {});
  }
}
