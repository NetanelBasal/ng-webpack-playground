import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { environment } from '../environments/environment';
import { translocoLoader } from './transloco.loader';
import { TranslocoModule, TRANSLOCO_CONFIG, TranslocoConfig } from '@ngneat/transloco';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule, HttpClientModule, TranslocoModule],
  providers: [
    {
      provide: TRANSLOCO_CONFIG,
      useValue: {
        listenToLangChange: false,
        defaultLang: 'en',
        fallbackLang: 'es',
        prodMode: environment.production,
        scopeStrategy: 'shared',
        scopeMapping: {
          'todos-page': 'todosPage'
        }
      } as TranslocoConfig
    },
    translocoLoader
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
