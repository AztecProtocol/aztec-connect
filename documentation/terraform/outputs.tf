output "cloudfront" {
  value = "${aws_cloudfront_distribution.documentation_distribution.id}"
}

output "s3" {
  value = "${aws_s3_bucket.documentation.bucket}"
}
