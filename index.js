import {PassThrough} from 'node:stream';

export default function multicastStream(sourceStream) {
	const consumers = new Set();
	let isStarted = false;

	const start = () => {
		if (isStarted) {
			return;
		}

		isStarted = true;

		sourceStream.on('data', chunk => {
			for (const consumer of consumers) {
				consumer.write(chunk);
			}
		});

		sourceStream.on('end', () => {
			for (const consumer of consumers) {
				consumer.end();
			}
		});

		sourceStream.on('error', error => {
			for (const consumer of consumers) {
				consumer.destroy(error);
			}
		});
	};

	return () => {
		const consumer = new PassThrough();
		consumers.add(consumer);

		consumer.on('close', () => {
			consumers.delete(consumer);
		});

		if (!isStarted) {
			start();
		}

		return consumer;
	};
}
