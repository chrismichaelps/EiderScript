<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { createEiderApp } from '../../../src/index.ts';
import type { EiderApp } from '../../../src/index.ts';
import { Effect } from 'effect';
import { usePlaygroundStore } from '../store/playground';

const store = usePlaygroundStore();

const previewContainer = ref<HTMLElement | null>(null);

let currentApp: EiderApp | null = null;
let compileTimeout: any = null;

const renderApp = async (yaml: string) => {
  if (!previewContainer.value || !yaml) return;
  
  // Cleanup previous instance
  if (currentApp) {
    try {
      if (currentApp.vueApp) {
        currentApp.vueApp.unmount();
      }
    } catch (e) {
      console.warn('Eider unmount warn:', e);
    }
    // Reset container
    if (previewContainer.value) {
      previewContainer.value.innerHTML = '';
    }
    currentApp = null;
  }

  store.setError(null);

  try {
    const isComponent = yaml.includes('template:') && !yaml.includes('router:');
    let appYaml = yaml;
    let componentsYaml: Record<string, string> = {};

    if (isComponent) {
      const nameMatch = yaml.match(/(?:^|\n)name:\s*([a-zA-Z0-9_]+)/);
      const compName = nameMatch ? nameMatch[1] : 'PlaygroundComponent';
      
      appYaml = `
name: PlaygroundWrapperApp
template:
  div .p-8 .flex .justify-center .items-center .min-h-full:
    ${compName}: {}
`;
      componentsYaml[compName] = yaml;
    }

    const program = createEiderApp({ 
      app: appYaml,
      components: componentsYaml,
      memoryRouter: true
    });
    const result = await Effect.runPromise(program);
    currentApp = result;
    
    // Mount container
    const host = document.createElement('div');
    const sessionId = Math.random().toString(36).substring(2, 9);
    host.id = `eider-playground-root-${sessionId}`;
    host.className = 'w-full min-h-full flex flex-col items-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300';
    previewContainer.value.appendChild(host);
    
    result.mount(`#${host.id}`);
  } catch (err: any) {
    console.error('EiderScript Compilation/Render Error:', err);
    store.setError(err.message || String(err));
  }
};

watch(() => store.yamlCode, (newYaml) => {
  if (compileTimeout) clearTimeout(compileTimeout);
  
  if (!newYaml.trim()) {
    if (previewContainer.value) previewContainer.value.innerHTML = '';
    return;
  }
  
  compileTimeout = setTimeout(() => {
    renderApp(newYaml);
  }, 500);
}, { immediate: true });

onBeforeUnmount(() => {
  if (compileTimeout) clearTimeout(compileTimeout);
  if (currentApp?.vueApp?.unmount) {
    currentApp.vueApp.unmount();
  }
});
</script>

<template>
  <section class="flex-1 flex flex-col bg-canvas border-l border-white/10 flex-shrink-0 relative overflow-hidden h-full z-0 dark:bg-gray-900" data-purpose="live-preview-section">
    <div class="flex-1 overflow-auto w-full h-full bg-white dark:bg-gray-950 flex flex-col custom-scrollbar relative z-0" id="render-target">
      
      <!-- Error State Overlay -->
      <div v-if="store.compilationError" class="absolute inset-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur flex p-8 flex-col justify-center text-center items-center">
        <div class="max-w-xl mx-auto w-full">
          <div class="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6 mx-auto ring-8 ring-red-50/50 dark:ring-red-900/10">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Compilation Failed</h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6 text-sm">Failed to parse or evaluate EiderScript AST</p>
          <div class="bg-red-50 dark:bg-black/50 p-4 rounded-xl border border-red-100 dark:border-red-900/30 overflow-x-auto text-left">
            <pre class="text-[12px] font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">{{ store.compilationError }}</pre>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-show="!store.yamlCode" class="flex-1 flex flex-col items-center justify-center p-20 text-center" id="empty-state">
        <div class="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-lg flex items-center justify-center mb-6">
          <svg class="w-6 h-6 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>
        </div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-200 uppercase tracking-widest">Build Manifest Ready</h3>
        <p class="text-gray-400 text-xs mt-2 max-w-[200px] leading-relaxed">Enter YAML content to compile EiderScript into HTML.</p>
      </div>
      
      <!-- Content render -->
      <div v-show="store.yamlCode && !store.compilationError" class="flex-1 flex flex-col fade-in w-full h-full relative" id="dynamic-content">
        <!-- App mount -->
        <div class="flex-1 w-full relative overflow-auto custom-scrollbar flex justify-center">
          <div class="absolute inset-0 w-full min-h-full flex flex-col items-center" ref="previewContainer"></div>
        </div>
      </div>

    </div>
  </section>
</template>

<style scoped>
.bg-canvas {
  background-color: #ffffff;
  background-image: radial-gradient(#f0f0f0 1px, transparent 1px);
  background-size: 24px 24px;
}
:root.dark .bg-canvas {
  background-color: #0d0d0d;
  background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
}
.fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
