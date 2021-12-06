output "cloudfront" {
  value = "${aws_cloudfront_distribution.zkmoney_testnet_distribution.id}"
}

output "s3" {
  value = "${aws_s3_bucket.zkmoney_testnet.bucket}"
}
