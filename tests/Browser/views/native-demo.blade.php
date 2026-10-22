<div>
    <output id="name-value">{{ $name }}</output>
    <input id="name" type="text" value="{{ $name }}" data-pharaonic="native-input" data-property="name" data-options='{"hint": "{{ $hint }}"}'>
    <button id="shout" wire:click="shout">shout</button>
    <button id="change-hint" wire:click="changeHint">hint</button>
    <button id="refresh" wire:click="$refresh">refresh</button>
</div>
