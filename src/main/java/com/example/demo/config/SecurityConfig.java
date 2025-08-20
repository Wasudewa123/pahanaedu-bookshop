package com.example.demo.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import com.example.demo.config.JwtAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import com.example.demo.service.CustomerDetailsService;
import org.springframework.http.HttpMethod;


@Configuration
public class SecurityConfig {

    @Autowired
    private CustomerDetailsService customerDetailsService;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

   
    // This is the missing bean!
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                            .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/customers/register", "/api/customers/login").permitAll()
                        .requestMatchers("/api/admin/login", "/api/admin/register").permitAll() // Allow admin login/register
                        .requestMatchers("/api/books", "/api/books/**", "/api/books/*/details").permitAll()
                        .requestMatchers("/api/email-subscription/**").permitAll() // Allow email subscription endpoints
                        .requestMatchers("/api/email-subscription/test-connection").permitAll() // Allow test connection endpoint
                        .requestMatchers("/api/analytics/**").permitAll() // Allow analytics endpoints for dashboard
                        .requestMatchers(HttpMethod.POST, "/api/orders").permitAll() // Allow guest orders
                        .requestMatchers(HttpMethod.GET, "/api/orders/email/*").permitAll() // Allow users to fetch their orders
                        .requestMatchers("/api/billing/**").permitAll() // Allow billing endpoints
                        // Require authentication for other admin APIs
                        .anyRequest().authenticated()
                    )
        .userDetailsService(customerDetailsService)
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
}

    // ✅ Add this bean
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allow specific origins for development
        configuration.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "file://*"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(false); // Set to false when using wildcard origins

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
