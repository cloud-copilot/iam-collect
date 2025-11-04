const { index } = require('@cloud-copilot/iam-collect');

exports.handler = async (event, context) => {
    const { s3Prefix } = event;

    console.log({
        message: 'invoked',
        function: 'index-data-lambda',
        requestId: context.awsRequestId,
        s3Prefix: s3Prefix
    });

    try {
        // Extract arguments from the event
        if (!s3Prefix) {
            throw new Error('Missing required parameter: bucketPrefix must be provided in the event');
        }

        // Read environment variables
        const storageBucketName = process.env.STORAGE_BUCKET_NAME;
        const storageBucketRegion = process.env.STORAGE_BUCKET_REGION;
        const partition = process.env.CURRENT_PARTITION || 'aws'; // Default to 'aws' if not set

        console.log({
            message: 'configuration-loaded',
            function: 'index-data-lambda',
            requestId: context.awsRequestId,
            config: {
                storageBucketName: storageBucketName,
                storageBucketRegion: storageBucketRegion,
                partition: partition,
                s3Prefix: s3Prefix
            }
        });

        const config = {
          storage: {
            type: "s3",
            bucket: storageBucketName,
            prefix: s3Prefix,
            region: storageBucketRegion,
          }
        };

        console.log({
            message: 'start-indexing',
            function: 'index-data-lambda',
            requestId: context.awsRequestId,
            s3Prefix: s3Prefix,
            partition: partition,
            concurrency: 50
        });

        await index(
          [config],  // The config to use
          partition, // The aws partition
          [],        // All accounts
          [],        // All regions
          [],        // All services
          50         // Set a high concurrency
        );

        console.log({
            message: 'index-completed',
            function: 'index-data-lambda',
            requestId: context.awsRequestId,
            s3Prefix: s3Prefix,
            storageBucket: storageBucketName,
            partition: partition
        });

        const response = {
            status: 'SUCCESS',
            statusCode: 200,
            message: 'Data indexing completed successfully',
            bucketPrefix: s3Prefix,
            storageBucket: storageBucketName,
            partition: partition,
            timestamp: new Date().toISOString(),
            requestId: context.awsRequestId
        };

        return response;

    } catch (error) {
        console.error({
            message: 'indexing-failed',
            function: 'index-data-lambda',
            requestId: context.awsRequestId,
            s3Prefix: s3Prefix,
            error: {
                message: error.message,
                type: error.constructor.name,
                stack: error.stack
            }
        });

        const errorResponse = {
            status: 'FAILED',
            statusCode: 500,
            error: {
                message: error.message,
                type: error.constructor.name,
                timestamp: new Date().toISOString(),
                bucketPrefix: s3Prefix
            },
            requestId: context.awsRequestId
        };

        return errorResponse;
    }
};