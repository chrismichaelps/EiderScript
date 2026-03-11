import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { examples, fetchExample } from '../examples';
import { detectYamlMetadata } from '../utils/yaml-metadata';

import pkg from '../../../package.json';

export const usePlaygroundStore = defineStore('playground', () => {
  const selectedExampleId = ref<string>(examples[0].id);
  const yamlCode = ref<string>('');
  const compilationError = ref<string | null>(null);
  const isLoading = ref<boolean>(false);

  // Project Metadata
  const projectVersion = ref<string>(pkg.version);
  const editorSpaces = ref<number>(2);
  
  const yamlMetadata = computed(() => detectYamlMetadata(yamlCode.value));
  const editorEncoding = computed(() => yamlMetadata.value.encoding);
  const yamlVersion = computed(() => yamlMetadata.value.version);

  const loadSelectedExample = async (id: string) => {
    const example = examples.find(e => e.id === id);
    if (!example) return;

    selectedExampleId.value = id;
    isLoading.value = true;
    compilationError.value = null;

    try {
      yamlCode.value = await fetchExample(example.id);
    } catch (err: any) {
      compilationError.value = `Failed to load snippet: ${err.message}`;
    } finally {
      isLoading.value = false;
    }
  };

  const updateCode = (newCode: string) => {
    yamlCode.value = newCode;
  };

  const setError = (error: string | null) => {
    compilationError.value = error;
  };

  return {
    selectedExampleId,
    yamlCode,
    compilationError,
    isLoading,
    projectVersion,
    editorSpaces,
    editorEncoding,
    yamlVersion,
    loadSelectedExample,
    updateCode,
    setError
  };
});
