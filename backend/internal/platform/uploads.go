package platform

import (
	"bytes"
	"crypto/rand"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type StoredFile struct {
	Name        string `json:"name"`
	URL         string `json:"url"`
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
}

type FileStorage struct {
	directory  string
	publicPath string
}

func NewFileStorage(directory string) FileStorage {
	return NewFileStorageAt(directory, "/uploads")
}

func NewFileStorageAt(directory, publicPath string) FileStorage {
	return FileStorage{directory: directory, publicPath: strings.TrimRight(publicPath, "/")}
}

func (s FileStorage) Save(file io.Reader, originalName string) (StoredFile, error) {
	if err := os.MkdirAll(s.directory, 0o750); err != nil {
		return StoredFile{}, fmt.Errorf("create uploads directory: %w", err)
	}

	temporary, err := os.CreateTemp(s.directory, ".upload-*")
	if err != nil {
		return StoredFile{}, fmt.Errorf("create temporary upload: %w", err)
	}
	temporaryName := temporary.Name()
	defer os.Remove(temporaryName)

	buffer := make([]byte, 512)
	count, readErr := io.ReadFull(file, buffer)
	if readErr != nil && readErr != io.ErrUnexpectedEOF && readErr != io.EOF {
		_ = temporary.Close()
		return StoredFile{}, fmt.Errorf("read upload: %w", readErr)
	}
	written, err := io.Copy(temporary, io.MultiReader(bytes.NewReader(buffer[:count]), file))
	if closeErr := temporary.Close(); err != nil {
		return StoredFile{}, fmt.Errorf("write upload: %w", err)
	} else if closeErr != nil {
		return StoredFile{}, fmt.Errorf("close upload: %w", closeErr)
	}

	name, err := generatedName(fileExtension(originalName))
	if err != nil {
		return StoredFile{}, err
	}
	if err := os.Rename(temporaryName, filepath.Join(s.directory, name)); err != nil {
		return StoredFile{}, fmt.Errorf("store upload: %w", err)
	}

	return StoredFile{
		Name:        name,
		URL:         s.publicPath + "/" + name,
		ContentType: http.DetectContentType(buffer[:count]),
		Size:        written,
	}, nil
}

func (s FileStorage) Delete(file StoredFile) error {
	return os.Remove(filepath.Join(s.directory, file.Name))
}

func generatedName(extension string) (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate file name: %w", err)
	}
	return fmt.Sprintf("%x%s", bytes, extension), nil
}

func fileExtension(originalName string) string {
	extension := strings.ToLower(filepath.Ext(filepath.Base(originalName)))
	if len(extension) > 16 {
		return ""
	}
	for _, character := range extension {
		if (character < 'a' || character > 'z') && (character < '0' || character > '9') && character != '.' {
			return ""
		}
	}
	return extension
}
