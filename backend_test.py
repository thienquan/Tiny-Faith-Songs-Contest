#!/usr/bin/env python3
"""
Backend API tests for Tiny Faith Songs Contest.
Tests /api/health and /api/register endpoints.
"""

import requests
import sys
import os
from datetime import datetime
from io import BytesIO

# Backend URL (override with BASE_URL when needed)
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8001")


class TinyFaithAPITester:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log(self, message, status="INFO"):
        """Log test messages"""
        prefix = {
            "PASS": "✅",
            "FAIL": "❌",
            "INFO": "🔍",
            "WARN": "⚠️"
        }.get(status, "ℹ️")
        print(f"{prefix} {message}")

    def run_test(self, name, test_func):
        """Run a single test and track results"""
        self.tests_run += 1
        self.log(f"Testing {name}...", "INFO")
        
        try:
            result = test_func()
            if result:
                self.tests_passed += 1
                self.log(f"{name} - PASSED", "PASS")
                self.test_results.append({"test": name, "status": "PASS", "error": None})
                return True
            else:
                self.log(f"{name} - FAILED", "FAIL")
                self.test_results.append({"test": name, "status": "FAIL", "error": "Test returned False"})
                return False
        except Exception as e:
            self.log(f"{name} - FAILED: {str(e)}", "FAIL")
            self.test_results.append({"test": name, "status": "FAIL", "error": str(e)})
            return False

    def test_health_endpoint(self):
        """Test GET /api/health"""
        url = f"{self.base_url}/api/health"
        response = requests.get(url, timeout=10)
        
        if response.status_code != 200:
            self.log(f"Health check failed with status {response.status_code}", "FAIL")
            return False
        
        data = response.json()
        self.log(f"Health response: {data}", "INFO")
        
        # Verify expected fields
        if not data.get("ok"):
            self.log("Health check 'ok' field is not True", "FAIL")
            return False
        
        if not data.get("service_account_present"):
            self.log("Service account not present", "WARN")
        
        expected_folder_id = "121rMtc6bwqBBARkwlpTch71WG1ESRVKN"
        if data.get("folder_id") != expected_folder_id:
            self.log(f"Folder ID mismatch: expected {expected_folder_id}, got {data.get('folder_id')}", "WARN")
        
        return True

    def test_register_validation_no_consent(self):
        """Test registration without consent - should fail"""
        url = f"{self.base_url}/api/register"
        
        # Create minimal form data without consent
        data = {
            "child_name": "Test Child",
            "parent_name": "Test Parent",
            "parent_email": "test@example.com",
            # No consent field
        }
        
        response = requests.post(url, data=data, timeout=30)
        
        # Should return 400 for missing consent
        if response.status_code == 400:
            self.log("Correctly rejected submission without consent", "PASS")
            return True
        else:
            self.log(f"Expected 400 for missing consent, got {response.status_code}", "FAIL")
            return False

    def test_register_validation_no_songs(self):
        """Test registration with no songs - should fail"""
        url = f"{self.base_url}/api/register"
        
        data = {
            "child_name": "Test Child",
            "parent_name": "Test Parent",
            "parent_email": "test@example.com",
            "consent": "true",
            "locale": "vi"
        }
        
        response = requests.post(url, data=data, timeout=30)
        
        # Should return 400 for no songs
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            if "at least one song" in detail.lower():
                self.log("Correctly rejected submission with no songs", "PASS")
                return True
        
        self.log(f"Expected 400 for no songs, got {response.status_code}", "FAIL")
        return False

    def test_register_validation_invalid_email(self):
        """Test registration with invalid email - should fail"""
        url = f"{self.base_url}/api/register"
        
        data = {
            "child_name": "Test Child",
            "parent_name": "Test Parent",
            "parent_email": "invalid-email",
            "consent": "true",
            "song_1_mode": "link",
            "song_1_link": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
        
        response = requests.post(url, data=data, timeout=30)
        
        # Should return 400 for invalid email
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            if "email" in detail.lower():
                self.log("Correctly rejected invalid email", "PASS")
                return True
        
        self.log(f"Expected 400 for invalid email, got {response.status_code}", "FAIL")
        return False

    def test_register_validation_invalid_link(self):
        """Test registration with invalid link - should fail"""
        url = f"{self.base_url}/api/register"
        
        data = {
            "child_name": "Test Child",
            "parent_name": "Test Parent",
            "parent_email": "test@example.com",
            "consent": "true",
            "song_1_mode": "link",
            "song_1_link": "https://example.com/not-a-valid-link"
        }
        
        response = requests.post(url, data=data, timeout=30)
        
        # Should return 400 for invalid link
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            if "invalid" in detail.lower() or "youtube" in detail.lower() or "drive" in detail.lower():
                self.log("Correctly rejected invalid link", "PASS")
                return True
        
        self.log(f"Expected 400 for invalid link, got {response.status_code}", "FAIL")
        return False

    def test_register_success_with_link(self):
        """Test successful registration with a YouTube link"""
        url = f"{self.base_url}/api/register"
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        data = {
            "child_name": f"Test Child {timestamp}",
            "parent_name": f"Test Parent {timestamp}",
            "parent_email": "test@example.com",
            "consent": "true",
            "locale": "en",
            "song_1_mode": "link",
            "song_1_link": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
        
        self.log("Submitting registration with YouTube link (this may take 10-30 seconds)...", "INFO")
        response = requests.post(url, data=data, timeout=60)
        
        if response.status_code != 200:
            self.log(f"Registration failed with status {response.status_code}: {response.text}", "FAIL")
            return False
        
        result = response.json()
        self.log(f"Registration response: {result}", "INFO")
        
        # Verify response structure
        if not result.get("success"):
            self.log("Response 'success' field is not True", "FAIL")
            return False
        
        if not result.get("folder_url"):
            self.log("No folder_url in response", "FAIL")
            return False
        
        if not result.get("folder_id"):
            self.log("No folder_id in response", "FAIL")
            return False
        
        # Check song results
        song_results = result.get("song_results", [])
        if len(song_results) != 6:
            self.log(f"Expected 6 song results, got {len(song_results)}", "FAIL")
            return False
        
        # First song should be type 'link'
        song_1 = song_results[0]
        if song_1.get("type") != "link":
            self.log(f"Song 1 type should be 'link', got '{song_1.get('type')}'", "FAIL")
            return False
        
        # Check email status
        email_status = result.get("email", {})
        if not email_status.get("sent"):
            self.log("Email was not sent", "WARN")
        else:
            self.log(f"Email sent to {email_status.get('to')}", "PASS")
        
        self.log(f"✅ Registration successful! Folder: {result.get('folder_url')}", "PASS")
        return True

    def run_all_tests(self):
        """Run all backend tests"""
        self.log("=" * 60, "INFO")
        self.log("Starting Tiny Faith Songs Backend API Tests", "INFO")
        self.log("=" * 60, "INFO")
        
        # Test health endpoint first
        self.run_test("Health Check", self.test_health_endpoint)
        
        # Test validation
        self.run_test("Validation: No Consent", self.test_register_validation_no_consent)
        self.run_test("Validation: No Songs", self.test_register_validation_no_songs)
        self.run_test("Validation: Invalid Email", self.test_register_validation_invalid_email)
        self.run_test("Validation: Invalid Link", self.test_register_validation_invalid_link)
        
        # Test successful registration
        self.run_test("Registration: Success with YouTube Link", self.test_register_success_with_link)
        
        # Print summary
        self.log("=" * 60, "INFO")
        self.log(f"Tests completed: {self.tests_passed}/{self.tests_run} passed", "INFO")
        self.log("=" * 60, "INFO")
        
        return self.tests_passed == self.tests_run


def main():
    tester = TinyFaithAPITester()
    success = tester.run_all_tests()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
