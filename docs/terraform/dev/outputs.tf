output "cloudfront" {
  value = "${aws_cloudfront_distribution.docs_distribution.id}"
}

output "s3" {
  value = "${aws_s3_bucket.docs.bucket}"
}
