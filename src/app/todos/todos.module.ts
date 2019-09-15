import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TodosRoutingModule } from './todos-routing.module';
import { TodosPageComponent } from './todos-page/todos-page.component';
import { TRANSLOCO_SCOPE, TranslocoModule } from '@ngneat/transloco';

@NgModule({
  declarations: [TodosPageComponent],
  providers: [{ provide: TRANSLOCO_SCOPE, useValue: 'todos-page' }],
  imports: [CommonModule, TodosRoutingModule, TranslocoModule]
})
export class TodosModule {}
