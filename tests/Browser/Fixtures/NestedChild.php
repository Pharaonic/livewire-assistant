<?php

declare(strict_types=1);

namespace Pharaonic\Livewire\Assistant\Tests\Browser\Fixtures;

use Livewire\Component;

final class NestedChild extends Component
{
    public string $country = '3';

    public function render()
    {
        return view('fixtures::nested-child');
    }
}
