output "cloudfront" {
  value = "${aws_cloudfront_distribution.block_explorer_distribution.id}"
}

output "s3" {
  value = "${aws_s3_bucket.block_explorer.bucket}"
}
