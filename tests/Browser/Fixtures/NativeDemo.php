<?php

declare(strict_types=1);

namespace Pharaonic\Livewire\Assistant\Tests\Browser\Fixtures;

use Livewire\Component;

final class NativeDemo extends Component
{
    public string $name = 'Ada';

    public string $hint = 'one';

    public function shout(): void
    {
        $this->name = strtoupper($this->name);
    }

    public function changeHint(): void
    {
        $this->hint = $this->hint === 'one' ? 'two' : 'one';
    }

    public function render()
    {
        return view('fixtures::native-demo');
    }
}
