<?php

declare(strict_types=1);

namespace Pharaonic\Livewire\Assistant;

use Illuminate\Support\Facades\URL;
use InvalidArgumentException;

/**
 * @internal The public API is the @livewireAssistantScripts directive and the
 *           pharaonic.livewire-assistant.script route.
 */
final class Script
{
    public const ROUTE = 'pharaonic.livewire-assistant.script';

    private const ONCE = 'pharaonic-livewire-assistant';

    private static ?string $version = null;

    public static function path(): string
    {
        return dirname(__DIR__).'/dist/livewire-assistant.js';
    }

    /**
     * Content hash of the built runtime, used to refresh browser caches after an update.
     */
    public static function version(): string
    {
        if (self::$version === null) {
            $hash = hash_file('sha256', self::path());

            if ($hash === false) {
                throw new InvalidArgumentException('The Pharaonic Livewire Assistant runtime is missing: '.self::path());
            }

            self::$version = substr($hash, 0, 16);
        }

        return self::$version;
    }

    /**
     * Compile @livewireAssistantScripts(...): print the tag once per page, using
     * the view factory's @once bookkeeping so partials and layouts share it.
     */
    public static function directive(string $expression): string
    {
        $options = trim($expression) === '' ? '[]' : $expression;
        $once = var_export(self::ONCE, true);

        return '<?php if (! $__env->hasRenderedOnce('.$once.')): '
            .'$__env->markAsRenderedOnce('.$once.'); '
            .'echo \\'.self::class.'::tag('.$options.'); '
            .'endif; ?>';
    }

    /**
     * @param  array<array-key, mixed>  $options
     */
    public static function tag(array $options = []): string
    {
        $unknown = array_diff(array_keys($options), ['nonce']);

        if ($unknown !== []) {
            throw new InvalidArgumentException('Unknown @livewireAssistantScripts option: '.implode(', ', $unknown).'. The only option is "nonce".');
        }

        $nonce = $options['nonce'] ?? null;

        if ($nonce !== null && ! is_string($nonce)) {
            throw new InvalidArgumentException('The "nonce" option of @livewireAssistantScripts must be a string.');
        }

        $src = URL::route(self::ROUTE, ['id' => self::version()]);
        $nonceAttribute = $nonce === null ? '' : ' nonce="'.e($nonce).'"';

        // wire:navigate re-runs body scripts unless they are marked to run once.
        return '<script src="'.e($src).'" data-navigate-once="true"'.$nonceAttribute.'></script>';
    }
}
