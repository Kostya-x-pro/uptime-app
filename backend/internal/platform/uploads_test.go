package platform

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func TestFileStorageSaveKeepsContentAndReturnsPublicURL(t *testing.T) {
	storage := NewFileStorage(t.TempDir())
	content := []byte("upload contents")

	stored, err := storage.Save(bytes.NewReader(content), "report.txt")
	if err != nil {
		t.Fatalf("Save() error = %v", err)
	}
	if stored.URL != "/uploads/"+stored.Name {
		t.Fatalf("URL = %q, want URL based on generated name", stored.URL)
	}
	if stored.Size != int64(len(content)) {
		t.Fatalf("Size = %d, want %d", stored.Size, len(content))
	}
	if filepath.Ext(stored.Name) != ".txt" {
		t.Fatalf("extension = %q, want .txt", filepath.Ext(stored.Name))
	}
	storedContent, err := os.ReadFile(filepath.Join(storage.directory, stored.Name))
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	if !bytes.Equal(storedContent, content) {
		t.Fatalf("stored content = %q, want %q", storedContent, content)
	}
}
