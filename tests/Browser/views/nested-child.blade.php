<div id="child">
    <output id="child-value">{{ $country }}</output>
    <div wire:ignore>
        <select id="child-select" data-pharaonic="select2" data-property="country" data-options='{"width": "200px"}'>
            <option value="1">Egypt</option>
            <option value="2">Jordan</option>
            <option value="3">Morocco</option>
        </select>
    </div>
</div>
