@livewire('native-demo')
<script type="module">
    import { register, scan, destroy, start } from '/static/livewire-assistant.esm.js';

    window.esmExports = { register, scan, destroy, start };

    // ESM-first: the browser build loads after the ES module and must reuse its runtime.
    if (new URLSearchParams(location.search).get('order') === 'none') {
        const script = document.createElement('script');
        script.src = @json(route('pharaonic.livewire-assistant.script', ['id' => \Pharaonic\Livewire\Assistant\Script::version()]));
        script.onload = () => { window.browserBuildLoaded = true };
        document.body.appendChild(script);
    }
</script>
