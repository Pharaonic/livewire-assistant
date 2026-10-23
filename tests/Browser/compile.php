<?php

declare(strict_types=1);

/*
 * Compiles every fixture view before the browser server starts. The server runs
 * several PHP workers, and Blade writes a compiled view without a lock: a worker
 * that reads it while another one is still writing it renders an empty view.
 */

use Pharaonic\Livewire\Assistant\Tests\Browser\Fixtures\FixtureApplication;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = (new FixtureApplication)->createApplication();
$views = __DIR__.'/views/';
$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($views, FilesystemIterator::SKIP_DOTS));

foreach ($files as $file) {
    $relative = substr($file->getPathname(), strlen($views), -strlen('.blade.php'));

    // The finder returns the path the workers compile to, so both share one compiled file.
    $app['blade.compiler']->compile($app['view']->getFinder()->find('fixtures::'.str_replace('/', '.', $relative)));
}
