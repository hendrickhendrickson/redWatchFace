import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
if (target === null) {
	throw new Error('no #app element to mount into');
}

// Not exported. This module is the entry point named in index.html; mounting IS the side effect,
// and the handle mount() returns has no second consumer. It used to be a default export, which
// rules.md forbids and which also implied someone might import it.
mount(App, { target });
