import {type Readable, type PassThrough} from 'node:stream';

/**
Creates a function that returns independent streams for each consumer.

@param sourceStream - The source stream to multicast.
@returns A function that returns a new `PassThrough` stream for each consumer.
*/
export default function multicastStream(sourceStream: Readable): () => PassThrough;
