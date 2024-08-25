<h1 align="center" title="multicast-stream">
	<img src="media/logo.jpg" alt="multicast-stream logo">
</h1>

> Create a multicast stream that lets multiple consumers independently read the same data

## Install

```sh
npm install multicast-stream
```

## Usage

**Without this package**

Using [`Readable#text()`](https://nodejs.org/api/webstreams.html#streamconsumerstextstream) on a stream can only work with a single consumer. If you try to read the stream with multiple consumers, it will be empty as the stream can only be read once.

```js
import {Readable} from 'node:stream';
import {text} from 'node:stream/consumers';

const sourceStream = Readable.from(['Hello', ' ', 'World']);
const [result1, result2] = await Promise.all([text(sourceStream), text(sourceStream)]);

console.log(result1); // 'Hello World'
console.log(result2); // ''
```

**With this package**

This package allows multiple consumers to independently read the same data from a single source stream.

```js
import {Readable} from 'node:stream';
import {text} from 'node:stream/consumers';
import multicastStream from 'multicast-stream';

const sourceStream = Readable.from(['Hello', ' ', 'World']);
const createConsumer = multicastStream(sourceStream);

const consumer1 = createConsumer();
const consumer2 = createConsumer();

const [result1, result2] = await Promise.all([text(consumer1), text(consumer2)]);

console.log(result1); // 'Hello World'
console.log(result2); // 'Hello World'
```

## API

### `multicastStream(sourceStream)`

Creates a function that returns independent streams for each consumer.

#### Parameters

- `sourceStream` (`Readable`): The source stream to multicast.

#### Returns

- `() => PassThrough`: A function that returns a new `PassThrough` stream for each consumer.
