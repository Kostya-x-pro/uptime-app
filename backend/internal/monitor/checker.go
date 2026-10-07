package monitor

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"time"
)

var sharedAddressSpace = netip.MustParsePrefix("100.64.0.0/10")

type HTTPChecker struct {
	client *http.Client
}

func NewHTTPChecker() *HTTPChecker {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil
	transport.DialContext = dialPublicAddress
	return newHTTPChecker(&http.Client{
		Timeout:       10 * time.Second,
		Transport:     transport,
		CheckRedirect: checkRedirect,
	})
}

func newHTTPChecker(client *http.Client) *HTTPChecker {
	return &HTTPChecker{client: client}
}

func (c *HTTPChecker) Check(ctx context.Context, address string) (Status, *int) {
	startedAt := time.Now()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, address, nil)
	if err != nil {
		return StatusDown, nil
	}
	response, err := c.client.Do(request)
	if err != nil {
		return StatusDown, nil
	}
	defer response.Body.Close()
	responseTimeMS := int(time.Since(startedAt).Milliseconds())
	if response.StatusCode >= http.StatusInternalServerError {
		return StatusDown, &responseTimeMS
	}
	return StatusUp, &responseTimeMS
}

func checkRedirect(request *http.Request, via []*http.Request) error {
	if len(via) >= 3 {
		return fmt.Errorf("too many redirects")
	}
	if request.URL.Scheme != "http" && request.URL.Scheme != "https" {
		return fmt.Errorf("unsupported redirect scheme")
	}
	if request.URL.User != nil || request.URL.Hostname() == "" {
		return fmt.Errorf("invalid redirect URL")
	}
	return nil
}

func dialPublicAddress(ctx context.Context, network, address string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return nil, err
	}
	addresses, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
	if err != nil {
		return nil, err
	}
	var dialer net.Dialer
	for _, ip := range addresses {
		if !isPublicAddress(ip) {
			continue
		}
		connection, err := dialer.DialContext(ctx, network, net.JoinHostPort(ip.String(), port))
		if err == nil {
			return connection, nil
		}
	}
	return nil, fmt.Errorf("no reachable public address for %s", host)
}

func isPublicAddress(address netip.Addr) bool {
	address = address.Unmap()
	return address.IsValid() && !address.IsLoopback() && !address.IsPrivate() &&
		!address.IsLinkLocalUnicast() && !address.IsLinkLocalMulticast() &&
		!address.IsMulticast() && !address.IsUnspecified() &&
		!sharedAddressSpace.Contains(address)
}
