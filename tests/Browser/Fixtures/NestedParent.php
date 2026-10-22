<?php

declare(strict_types=1);

namespace Pharaonic\Livewire\Assistant\Tests\Browser\Fixtures;

use Livewire\Component;

final class NestedParent extends Component
{
    public string $country = '1';

    public bool $showChild = true;

    public function toggleChild(): void
    {
        $this->showChild = ! $this->showChild;
    }

    public function render()
    {
        return view('fixtures::nested-parent');
    }
}
