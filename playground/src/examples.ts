/// <reference types="vite/client" />
import authFormUrl from '../../examples/auth-form.eider.yaml?raw';
import modalUrl from '../../examples/modal.eider.yaml?raw';
import themeToggleUrl from '../../examples/theme-toggle.eider.yaml?raw';
import todoAppUrl from '../../examples/todo-app.eider.yaml?raw';
import publicApiFetchUrl from '../../examples/public-api-fetch.eider.yaml?raw';
import componentSyncUrl from '../../examples/component-sync.eider.yaml?raw';
import directivesDemoUrl from '../../examples/directives-demo.eider.yaml?raw';
import staticContentUrl from '../../examples/static-content.eider.yaml?raw';
import counterUrl from '../../examples/counter.eider.yaml?raw';
import routingUrl from '../../examples/routing.eider.yaml?raw';

export interface Example {
  id: string;
  name: string;
  code: string;
}

export const examples: Example[] = [
  { id: 'auth-form', name: 'Auth Form', code: authFormUrl },
  { id: 'modal', name: 'Modal', code: modalUrl },
  { id: 'theme-toggle', name: 'Theme Toggle', code: themeToggleUrl },
  { id: 'todo-app', name: 'Todo App', code: todoAppUrl },
  { id: 'public-api-fetch', name: 'API Fetch', code: publicApiFetchUrl },
  { id: 'component-sync', name: 'Component Sync', code: componentSyncUrl },
  { id: 'directives-demo', name: 'Directives', code: directivesDemoUrl },
  { id: 'static-content', name: 'Static Content', code: staticContentUrl },
  { id: 'counter', name: 'Counter', code: counterUrl },
  { id: 'routing', name: 'Routing', code: routingUrl }
];

export async function fetchExample(id: string): Promise<string> {
  const example = examples.find(e => e.id === id);
  if (!example) throw new Error(`Example not found: ${id}`);

  // Return the raw text directly from the vite import
  return example.code;
}
