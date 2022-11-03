output "cloudfront" {
  value = "${aws_cloudfront_distribution.hummus_distribution.id}"
}

output "s3" {
  value = "${aws_s3_bucket.hummus.bucket}"
}
