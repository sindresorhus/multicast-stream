import {Readable} from 'node:stream';
import {text} from 'node:stream/consumers';
import test from 'ava';
import multicastStream from './index.js';

const createFixtureStream = () => Readable.from(['Hello', ' ', 'World']);

test('creates independent consumers', async t => {
	const sourceStream = createFixtureStream();
	const createConsumer = multicastStream(sourceStream);

	const consumer1 = createConsumer();
	const consumer2 = createConsumer();

	const [result1, result2] = await Promise.all([
		text(consumer1),
		text(consumer2),
	]);

	t.is(result1, 'Hello World');
	t.is(result2, 'Hello World');
});

test('handles large amount of data', async t => {
	const fixtureSize = 1_000_000;
	const largeData = Buffer.from('x'.repeat(fixtureSize));
	const sourceStream = Readable.from([largeData]);

	const createConsumer = multicastStream(sourceStream);

	const consumer1 = createConsumer();
	const consumer2 = createConsumer();

	const [result1, result2] = await Promise.all([
		text(consumer1),
		text(consumer2),
	]);

	t.is(result1.length, fixtureSize);
	t.is(result2.length, fixtureSize);
	t.is(result1, largeData.toString());
	t.is(result2, largeData.toString());
});

test('is lazy and only starts consuming when first consumer reads', async t => {
	let consumed = false;
	const sourceStream = new Readable({
		read() {
			consumed = true;
			this.push('data');
			this.push(null);
		},
	});

	const createConsumer = multicastStream(sourceStream);

	t.false(consumed, 'Source stream should not be consumed before any consumer reads');

	const consumer = createConsumer();
	t.false(consumed, 'Source stream should not be consumed when consumer is created');

	// Use text() to start consuming the stream
	const result = await text(consumer);

	t.true(consumed, 'Source stream should be consumed when consumer starts reading');
	t.is(result, 'data', 'Consumer should receive the correct data');
});

test('handles errors from source stream', async t => {
	const sourceStream = new Readable({
		read() {
			this.emit('error', new Error('Source stream error'));
		},
	});

	const createConsumer = multicastStream(sourceStream);
	const consumer = createConsumer();

	await t.throwsAsync(async () => {
		await text(consumer);
	}, {message: 'Source stream error'});
});

test('handles source stream ending', async t => {
	const sourceStream = Readable.from(['data']);
	const createConsumer = multicastStream(sourceStream);
	const consumer = createConsumer();

	const result = await text(consumer);
	t.is(result, 'data', 'Should receive correct data');

	// Try to read from the ended stream
	const endedResult = await text(consumer);
	t.is(endedResult, '', 'Should return empty string for ended stream');
});

test('handles source stream destruction', async t => {
	const sourceStream = Readable.from(['data']);
	const createConsumer = multicastStream(sourceStream);
	const consumer1 = createConsumer();
	const consumer2 = createConsumer();

	const consumer1ErrorPromise = new Promise(resolve => {
		consumer1.on('error', error => {
			resolve(error);
		});
	});

	const consumer2ErrorPromise = new Promise(resolve => {
		consumer2.on('error', error => {
			resolve(error);
		});
	});

	// Destroy the source stream
	sourceStream.destroy(new Error('Stream destroyed'));

	// Await the errors from the consumers
	const [error1, error2] = await Promise.all([consumer1ErrorPromise, consumer2ErrorPromise]);

	// Check the error messages
	t.is(error1.message, 'Stream destroyed');
	t.is(error2.message, 'Stream destroyed');
});

test('handles consumer error without affecting others', async t => {
	const createConsumer = multicastStream(createFixtureStream());
	const consumer1 = createConsumer();
	const consumer2 = createConsumer();
	const consumer2Text = text(consumer2);

	// Simulate an error in consumer1
	consumer1.on('error', () => {});
	consumer1.destroy(new Error('Consumer error'));

	// Ensure consumer2 is not affected and can still read
	t.is(await consumer2Text, 'Hello World');
});
