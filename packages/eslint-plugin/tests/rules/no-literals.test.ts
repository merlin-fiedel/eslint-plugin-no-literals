import parser from '@typescript-eslint/parser';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noLiterals } from '../../src/rules/no-literals.js';

const ruleTester = new RuleTester({
  languageOptions: { parser },
});

ruleTester.run('no-literals', noLiterals, {
  valid: [
    // ── outside a class ───────────────────────────────────────────────────
    {
      name: 'string at module scope is ignored',
      code: `const greeting = 'hello world';`,
    },
    {
      name: 'string inside a plain function is ignored',
      code: `function greet() { return 'hello world'; }`,
    },

    // ── minLength (default: 2) ────────────────────────────────────────────
    {
      name: 'single-character string in class property is ignored',
      code: `class Foo { label = 'x'; }`,
    },
    {
      name: 'empty string in class property is ignored',
      code: `class Foo { label = ''; }`,
    },
    {
      name: 'string below custom minLength is ignored',
      code: `class Foo { label = 'ok'; }`,
      options: [{ minLength: 5 }],
    },

    // ── ignoredCallExpressions (default: console.*) ───────────────────────
    {
      name: 'string in console.log is ignored by default',
      code: `class Foo { run() { console.log('debug output'); } }`,
    },
    {
      name: 'string in console.error is ignored by default',
      code: `class Foo { run() { console.error('fatal error occurred'); } }`,
    },
    {
      name: 'string in console.warn is ignored by default',
      code: `class Foo { run() { console.warn('deprecation warning'); } }`,
    },
    {
      name: 'string in custom ignored call expression is ignored',
      code: `class Foo { run() { this.i18n.translate('some.key'); } }`,
      options: [{ ignoredCallExpressions: ['this.i18n.translate'] }],
    },
    {
      name: 'string nested inside ignored call expression is ignored',
      code: `class Foo { run() { console.log('prefix' + someVar); } }`,
    },

    // ── ignorePatterns ────────────────────────────────────────────────────
    {
      name: 'string matching ignorePattern regex is ignored',
      code: `class Foo { action = 'SAVE_ACTION'; }`,
      options: [{ ignorePatterns: ['^[A-Z_]+$'] }],
    },
    {
      name: 'string matching one of multiple ignorePatterns is ignored',
      code: `class Foo { route = '/api/users'; }`,
      options: [{ ignorePatterns: ['^/api/', '^https?://'] }],
    },

    // ── decorators ────────────────────────────────────────────────────────
    {
      name: 'string inside a class-level decorator is ignored',
      code: `
        function Component(opts: { selector: string }) { return () => {}; }
        @Component({ selector: 'app-root' })
        class AppComponent {}
      `,
    },
    {
      name: 'string inside a member-level decorator is ignored',
      code: `
        function Column(type: string) { return () => {}; }
        class Entity {
          @Column('varchar')
          name = '';
        }
      `,
    },
    {
      name: 'class with only decorator strings and no plain literals is clean',
      code: `
        function Input(alias: string) { return () => {}; }
        class Foo {
          @Input('myAlias')
          value = '';
        }
      `,
    },

    // ── quoted object property keys ──────────────────────────────────────
    {
      name: 'quoted key in a shallow object literal is ignored',
      code: `class Foo { map = { 'someKey': 42 }; }`,
    },
    {
      name: 'quoted keys in a nested object literal are ignored',
      code: `class Foo { data = { 'AD': { 'latitude': 42.5, 'longitude': 1.5 } }; }`,
    },
    {
      name: 'quoted keys assigned via this inside a method are ignored',
      code: `class Foo { init() { this.cfg = { 'width': 100, 'height': 200 }; } }`,
    },

    // ── dynamic import specifier ──────────────────────────────────────────
    {
      name: 'dynamic import specifier in async method is ignored',
      code: `class Foo { async load() { const { bar } = await import('some-module'); } }`,
    },
    {
      name: 'dynamic import specifier in property initializer is ignored',
      code: `class Foo { mod = import('some-module'); }`,
    },

    // ── computed member expression key ────────────────────────────────────
    {
      name: 'string used as computed member key (SimpleChanges-style) is ignored',
      code: `class Foo { check(changes: any) { const x = changes['propName']; } }`,
    },
    {
      name: 'string used as computed key on this is ignored',
      code: `class Foo { get() { return this.store['someKey']; } }`,
    },

    // ── typeof comparison operands ────────────────────────────────────────
    {
      name: 'typeof x === "string" right-hand operand is ignored',
      code: `class Foo { check(x: unknown) { return typeof x === 'string'; } }`,
    },
    {
      name: 'typeof x !== "undefined" right-hand operand is ignored',
      code: `class Foo { check(x: unknown) { return typeof x !== 'undefined'; } }`,
    },
    {
      name: 'typeof x === "number" right-hand operand is ignored',
      code: `class Foo { check(x: unknown) { return typeof x === 'number'; } }`,
    },

    // ── no-literals-ignore escape hatch ───────────────────────────────────
    {
      name: 'inline no-literals-ignore comment suppresses the violation',
      code: `class Foo { label = 'Speichern'; // no-literals-ignore\n}`,
    },
    {
      name: 'no-literals-ignore on the previous line suppresses the violation',
      code: `class Foo {\n// no-literals-ignore\nlabel = 'Speichern';\n}`,
    },
  ],

  invalid: [
    // ── basic detection ───────────────────────────────────────────────────
    {
      name: 'string in class property initializer is flagged',
      code: `class Foo { label = 'Speichern'; }`,
      errors: [{ messageId: 'noLiteral', data: { value: 'Speichern' } }],
    },
    {
      name: 'string in method body assignment is flagged',
      code: `class Foo { method() { this.error = 'Ungültige Eingabe'; } }`,
      errors: [{ messageId: 'noLiteral', data: { value: 'Ungültige Eingabe' } }],
    },
    {
      name: 'string in method return statement is flagged',
      code: `class Foo { getLabel() { return 'Submit'; } }`,
      errors: [{ messageId: 'noLiteral', data: { value: 'Submit' } }],
    },
    {
      name: 'multiple literals in the same class each produce a violation',
      code: `class Foo { a = 'First'; b = 'Second'; }`,
      errors: [
        { messageId: 'noLiteral', data: { value: 'First' } },
        { messageId: 'noLiteral', data: { value: 'Second' } },
      ],
    },
    {
      name: 'string in a class expression is flagged',
      code: `const Foo = class { label = 'Speichern'; };`,
      errors: [{ messageId: 'noLiteral', data: { value: 'Speichern' } }],
    },

    // ── minLength edge cases ──────────────────────────────────────────────
    {
      name: 'string at exactly minLength is flagged',
      code: `class Foo { label = 'ab'; }`,
      errors: [{ messageId: 'noLiteral' }],
    },
    {
      name: 'two-character string is flagged when minLength is 1',
      code: `class Foo { label = 'ab'; }`,
      options: [{ minLength: 1 }],
      errors: [{ messageId: 'noLiteral' }],
    },

    // ── ignorePatterns: non-matching strings are still flagged ────────────
    {
      name: 'string not matching ignorePattern is still flagged',
      code: `class Foo { label = 'Speichern'; }`,
      options: [{ ignorePatterns: ['^[A-Z_]+$'] }],
      errors: [{ messageId: 'noLiteral', data: { value: 'Speichern' } }],
    },

    // ── decorator exclusion: non-decorator strings are still flagged ──────
    {
      name: 'property initializer value is flagged even when the class has decorators',
      code: `
        function Component(opts: { selector: string }) { return () => {}; }
        @Component({ selector: 'app-root' })
        class AppComponent {
          title = 'My App';
        }
      `,
      errors: [{ messageId: 'noLiteral', data: { value: 'My App' } }],
    },

    // ── ignoredCallExpressions: non-matching calls still flagged ──────────
    {
      name: 'string in non-ignored call expression is flagged',
      code: `class Foo { run() { alert('something wrong'); } }`,
      errors: [{ messageId: 'noLiteral', data: { value: 'something wrong' } }],
    },

    // ── object property key guard boundary ───────────────────────────────
    {
      name: 'string value of a quoted-key property is still flagged',
      code: `class Foo { data = { 'myKey': 'flagged value' }; }`,
      errors: [{ messageId: 'noLiteral', data: { value: 'flagged value' } }],
    },

    // ── computed member key guard boundary ───────────────────────────────
    {
      name: 'string assigned to a computed member (value side) is still flagged',
      code: `class Foo { set(obj: any) { obj['key'] = 'flagged value'; } }`,
      errors: [{ messageId: 'noLiteral', data: { value: 'flagged value' } }],
    },

    // ── typeof guard boundary: non-typeof binary comparison still flagged ──
    {
      name: 'string compared to another string (not typeof) is still flagged',
      code: `class Foo { check(s: string) { return s === 'pending'; } }`,
      errors: [{ messageId: 'noLiteral', data: { value: 'pending' } }],
    },

    // ── no-literals-ignore: only exact match suppresses ───────────────────
    {
      name: 'a different comment does not suppress the violation',
      code: `class Foo { label = 'Speichern'; // some other comment\n}`,
      errors: [{ messageId: 'noLiteral' }],
    },
  ],
});
