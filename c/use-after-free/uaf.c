#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    char *name = malloc(16); //16 bytes from heap, *name store address
    strcpy(name, "junaid"); //copy "junaid" in allocated memory
    printf("before free: %s (%p)\n", name, (void *)name);//format place holder memory and name

    free(name); //release allocated memory back to memory allocator

    char *other = malloc(16);
    strcpy(other, "hacker");
    printf("other: %s (%p)\n", other, (void *)other);

    printf("after free:  %s\n", name); 
    return 0;
}