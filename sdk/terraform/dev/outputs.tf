output "cloudfront" {
  value = "${aws_cloudfront_distribution.sdk_distribution.id}"
}

output "s3" {
  value = "${aws_s3_bucket.sdk.bucket}"
}
