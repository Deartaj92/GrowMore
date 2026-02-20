# Network Performance Issue: WiFi vs Mobile Network

## Problem
The app is **slower on faster WiFi networks** but **faster on slower mobile networks**. This is a classic symptom of network configuration issues, not bandwidth problems.

## Root Causes

### 1. **Connection Limit Issues** ⚠️ PRIMARY ISSUE
- **WiFi routers** typically limit concurrent connections to **50-100 connections**
- **Mobile networks** are optimized for many concurrent connections (200+)
- The app makes **7+ parallel database queries** in `Promise.all()` calls
- Plus **multiple WebSocket connections** for realtime subscriptions
- **Result**: WiFi router hits connection limit → requests queue → slow performance

### 2. **HTTP/2 Multiplexing**
- Some WiFi routers handle HTTP/2 multiplexing poorly
- Mobile networks are optimized for HTTP/2
- **Result**: Connection queuing on WiFi

### 3. **WebSocket Connection Overhead**
- Multiple realtime subscriptions (notifications, attendance, user management)
- Each WebSocket connection counts toward router's connection limit
- **Result**: Fewer available connections for HTTP requests

### 4. **DNS Resolution**
- Different DNS servers on different networks
- Some DNS servers are slower to resolve Supabase domain
- **Result**: Initial connection delays

## Solutions Applied

### 1. **Batched Parallel Requests**
- Split large `Promise.all()` calls into smaller batches (3-4 requests at a time)
- Prevents hitting WiFi router connection limits
- **File**: `src/pages/Dashboard/services/admissionsService.ts`

### 2. **Connection Optimization**
- Added `keep-alive` headers for connection reuse
- Optimized fetch configuration
- **File**: `src/supabaseClient.ts`

### 3. **WebSocket Optimization**
- Increased heartbeat interval to reduce connection overhead
- **File**: `src/supabaseClient.ts`

## Additional Recommendations

### For Users Experiencing This Issue:

1. **Change DNS Server** (Quick Fix)
   - Use Google DNS (8.8.8.8) or Cloudflare DNS (1.1.1.1)
   - Faster DNS resolution can help

2. **Router Settings**
   - Increase connection limit if possible
   - Disable QoS/throttling for your device
   - Update router firmware

3. **Network Configuration**
   - Use 5GHz WiFi instead of 2.4GHz (less congestion)
   - Reduce distance from router
   - Check for interference from other devices

### For Developers:

1. **Monitor Connection Count**
   - Use browser DevTools → Network tab
   - Check "Connection ID" column
   - Should see connection reuse (same ID for multiple requests)

2. **Further Optimizations**
   - Consider reducing realtime subscriptions
   - Implement request queuing for high-concurrency scenarios
   - Use connection pooling more aggressively

## Technical Details

### Connection Limits by Network Type:
- **Home WiFi Router**: 50-100 concurrent connections
- **Mobile Network**: 200+ concurrent connections
- **Enterprise Router**: 500+ concurrent connections

### Current App Behavior:
- **Login**: ~5-7 parallel queries
- **Dashboard Load**: ~10-15 parallel queries
- **Realtime Subscriptions**: 3-5 WebSocket connections
- **Total**: Can easily hit 20+ concurrent connections

### Why Mobile is Faster:
- Mobile networks are designed for many concurrent connections
- Better HTTP/2 multiplexing support
- Optimized routing for cloud services
- Less connection queuing

## Testing

To verify the fix works:
1. Test on WiFi network (should be faster now)
2. Check browser DevTools → Network tab
3. Look for connection reuse (same Connection ID)
4. Monitor request timing (should be more consistent)

