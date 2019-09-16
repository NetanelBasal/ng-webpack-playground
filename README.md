- Run yarn install both on the root directory and the transloco-keys-manager directory.
- Run npm start

The project contains two pages. The main page, and a lazy load page which also scoped to `todos-page`.

You can start adding keys to` app.component.html`, and `todos-page.component.html`. Here are a couple of examples:

```html
// app.component.html

<ng-template transloco let-t>
  {{ t.newKey }}
  {{ t.some.nested.key }}
</ng-template>

<p>{{ 'newPipeKey' | transloco }}</p>
```

```html
// todos-page.component.html

<ng-template transloco let-t>
  {{ t.todosPage.newKey }}
  {{ t.todosPage.should.be.in.scope.file }}
</ng-template>

<ng-container *transloco="let t">
  {{ condition ? t.todosPage.wow : t.global }}
</ng-container>
```

Or in `app.componen.ts`:
```ts
export class AppComponent {
  constructor(private translocoService: TranslocoService) {
    translocoService.translate('keyFromComponent');
  }
}
```

When you hit save, you should see the keys in the translation files. (`en.json`, `es.json`)

## Find Missing Keys
Close the dev-server, and remove some keys from the translation file/s. In the root project run `npm run validate-keys`. Missing keys should be added, and logged.