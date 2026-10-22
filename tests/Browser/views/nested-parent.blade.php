<div id="parent">
    <output id="parent-value">{{ $country }}</output>
    <div wire:ignore>
        <select id="parent-select" data-pharaonic="select2" data-property="country" data-options='{"width": "200px"}'>
            <option value="1">Egypt</option>
            <option value="2">Jordan</option>
            <option value="3">Morocco</option>
        </select>
    </div>

    @if ($showChild)
        @livewire('nested-child')
    @endif

    <button id="toggle-child" wire:click="toggleChild">toggle child</button>
</div>
