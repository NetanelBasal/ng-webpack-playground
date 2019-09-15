import { Component } from '@angular/core';
import { TranslocoService, translate } from '@ngneat/transloco';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
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
  }

  change(lang: string) {
    this.service.selectTranslate('38').subscribe();
    this.service.selectTranslate('39').subscribe();
    this.service.selectTranslate('40.41.42').subscribe();

    this.a = translate('43');
    this.b = translate('44', {});
  }
}
